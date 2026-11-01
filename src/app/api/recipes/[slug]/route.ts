import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/**
 * Wave 17 — single recipe detail (feature 5/7: the 16-field recipe page).
 * Includes nutrition (when seeded), storage, substitutions and review status.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withUser(req, [], async ({ user }) => {
    const { slug } = await params;
    const recipe = await db.nutritionRecipe.findUnique({ where: { slug } });
    if (!recipe || recipe.status !== 'PUBLISHED') {
      return json({ recipe: null }, 404);
    }
    const favorite = await db.recipeFavorite.findUnique({
      where: { userId_recipeId: { userId: user.id, recipeId: recipe.id } },
    });
    return json({
      recipe: {
        slug: recipe.slug,
        audience: recipe.audience,
        ageGroup: recipe.ageGroup,
        ageFromDays: recipe.ageFromDays,
        ageToDays: recipe.ageToDays,
        category: recipe.category,
        mealTypes: JSON.parse(recipe.mealTypes) as string[],
        title: recipe.title,
        titleEn: recipe.titleEn,
        image: recipe.image,
        ingredients: JSON.parse(recipe.ingredients) as Array<{ fa: string; en: string; amount: string }>,
        steps: JSON.parse(recipe.steps) as Array<{ fa: string; en: string }>,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        servings: recipe.servings,
        textureFa: recipe.textureFa,
        textureEn: recipe.textureEn,
        allergens: JSON.parse(recipe.allergens) as string[],
        safety: JSON.parse(recipe.safety) as Array<{ fa: string; en: string }>,
        storageFa: recipe.storageFa,
        storageEn: recipe.storageEn,
        substitutions: recipe.substitutions ? JSON.parse(recipe.substitutions) as Array<{ fa: string; en: string }> : [],
        nutrition: recipe.nutrition ? JSON.parse(recipe.nutrition) as Record<string, number> : null,
        medicalSource: recipe.medicalSource,
        reviewedAt: recipe.reviewedAt,
        contentVersion: recipe.contentVersion,
        favorite: Boolean(favorite),
      },
    });
  });
}
