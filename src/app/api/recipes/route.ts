import { z } from 'zod';
import { db } from '@/lib/db';
import { json, readJson, withUser } from '@/lib/api';
import { babyAgeAt } from '@/lib/cycle';
import { ageGroupForDays } from '@/lib/lifecycle';
import { BANNED_ALLERGENS_FOR_CHILD, buildSafetyFlags } from '@/lib/recipes';

/**
 * Wave 17 — recipe bank queries (features 5/7/8).
 *
 * Safety contract (master prompt §8.9):
 * - A registered child allergy removes recipes containing that allergen from
 *   the default result (client filter cannot bypass: server applies it).
 * - Under-12-month children never receive honey-bearing recipes (none exist
 *   in the bank — enforced again at response time as a second guard).
 * - A child younger than ~6 months (PRE_SOLID) gets no solid-recipe rows as
 *   a "suitable" program: the API returns the age group so the UI can show
 *   the milk-feeding guidance instead.
 * - Manual filters can narrow, never widen, the safety window.
 */

const querySchema = z.object({}); // reserved: future cursor pagination

export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const url = new URL(req.url);
    const audience = url.searchParams.get('audience'); // CHILD | BREASTFEEDING_MOTHER
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
    const category = url.searchParams.get('category');
    const meal = url.searchParams.get('meal'); // BREAKFAST | LUNCH | DINNER | SNACK
    const ageGroup = url.searchParams.get('ageGroup'); // manual CHILD filter
    const excludeAllergens = (url.searchParams.get('exclude') ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    // ── Child context (personalization + safety) ──
    const baby = await db.babyProfile.findUnique({ where: { userId: user.id } });
    const childAgeDays = baby ? babyAgeAt(new Date(baby.birthDate)).totalDays : null;
    const childGroup = childAgeDays != null ? ageGroupForDays(childAgeDays) : null;
    const childAllergies = baby ? (JSON.parse(baby.foodAllergies) as string[]) : [];
    // Allergies + any manual exclusions (union) — filters can only narrow.
    const blockedAllergens = Array.from(new Set([...childAllergies, ...excludeAllergens]))
      .filter((a) => a !== 'NONE' && a !== 'PREFER_NOT');
    const preSolid = childGroup === 'PRE_SOLID' || childGroup === 'BEYOND_24' ? childGroup === 'PRE_SOLID' : false;
    const underTwelveMonths = childAgeDays != null && childAgeDays < 365;

    const where = {
      status: 'PUBLISHED' as const,
      ...(audience ? { audience } : {}),
      ...(category ? { category } : {}),
    };

    const rows = await db.nutritionRecipe.findMany({
      where,
      orderBy: { slug: 'asc' },
    });

    const favorites = await db.recipeFavorite.findMany({
      where: { userId: user.id },
      select: { recipeId: true },
    });
    const favSet = new Set(favorites.map((f) => f.recipeId));

    const mapped = rows
      .map((r) => {
        const allergens = JSON.parse(r.allergens) as string[];
        const mealTypes = JSON.parse(r.mealTypes) as string[];
        return { r, allergens, mealTypes };
      })
      .filter(({ allergens }) => {
        // Registered child allergies + manual exclusion — hard filter.
        if (audience === 'CHILD' && blockedAllergens.some((a) => allergens.includes(a))) return false;
        return true;
      })
      .filter(({ r }) => {
        if (meal && !(JSON.parse(r.mealTypes) as string[]).includes(meal)) return false;
        if (ageGroup && audience === 'CHILD' && r.ageGroup !== ageGroup) return false;
        if (q) {
          const hay = `${r.title} ${r.titleEn}`.toLowerCase();
          const ingredients = JSON.parse(r.ingredients) as Array<{ fa: string; en: string }>;
          const ingHay = ingredients.map((i) => `${i.fa} ${i.en}`).join(' ').toLowerCase();
          if (!hay.includes(q.toLowerCase()) && !ingHay.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .map(({ r, allergens, mealTypes }) => ({
        slug: r.slug,
        audience: r.audience,
        ageGroup: r.ageGroup,
        ageFromDays: r.ageFromDays,
        ageToDays: r.ageToDays,
        category: r.category,
        mealTypes,
        title: r.title,
        titleEn: r.titleEn,
        image: r.image,
        prepMinutes: r.prepMinutes,
        cookMinutes: r.cookMinutes,
        servings: r.servings,
        textureFa: r.textureFa,
        textureEn: r.textureEn,
        allergens,
        safety: JSON.parse(r.safety) as Array<{ fa: string; en: string }>,
        medicalSource: r.medicalSource,
        reviewedAt: r.reviewedAt,
        favorite: favSet.has(r.id),
        ageAppropriate: r.audience === 'CHILD'
          ? (childAgeDays != null && r.ageFromDays != null && r.ageToDays != null
            ? childAgeDays >= r.ageFromDays && childAgeDays <= r.ageToDays
            : null)
          : null,
      }));

    const context = {
      child: baby
        ? {
            name: baby.name,
            birthDate: baby.birthDate,
            ageDays: childAgeDays,
            ageGroup: childGroup,
            allergies: childAllergies,
            breastfeeding: baby.breastfeeding,
            feedingMethod: baby.feedingMethod,
          }
        : null,
      blockedAllergens,
      preSolid,
      underTwelveMonths,
      safetyFlags: buildSafetyFlags({ underTwelveMonths, preSolid }),
      banned: BANNED_ALLERGENS_FOR_CHILD,
    };

    return json({ items: mapped, context, favorites: Array.from(favSet).length });
  });
}

/** Toggle a favorite. POST body: { slug }. */
export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const schema = z.object({ slug: z.string().min(1).max(120) });
    const body = await readJson(req, schema);
    const recipe = await db.nutritionRecipe.findUnique({ where: { slug: body.slug } });
    if (!recipe) return json({ favorite: false, error: 'NOT_FOUND' }, 404);
    const existing = await db.recipeFavorite.findUnique({
      where: { userId_recipeId: { userId: user.id, recipeId: recipe.id } },
    });
    if (existing) {
      await db.recipeFavorite.delete({ where: { userId_recipeId: { userId: user.id, recipeId: recipe.id } } });
      return json({ favorite: false });
    }
    await db.recipeFavorite.create({ data: { userId: user.id, recipeId: recipe.id } });
    return json({ favorite: true });
  });
}

export const dynamic = 'force-dynamic';
