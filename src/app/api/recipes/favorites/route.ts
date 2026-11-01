import { db } from '@/lib/db';
import { json, withUser } from '@/lib/api';

/**
 * Wave 17 — saved recipes (feature 5.9 «امکان ذخیره دستور در علاقه‌مندی‌ها»).
 * GET lists the user's favorites (full recipe rows); POST toggles by slug
 * (also mirrored in /api/recipes POST — this route is the list source).
 */
export async function GET(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const favorites = await db.recipeFavorite.findMany({
      where: { userId: user.id },
      include: { recipe: true },
      orderBy: { createdAt: 'desc' },
    });
    return json({
      items: favorites.map((f) => ({
        slug: f.recipe.slug,
        title: f.recipe.title,
        titleEn: f.recipe.titleEn,
        image: f.recipe.image,
        audience: f.recipe.audience,
        ageGroup: f.recipe.ageGroup,
        category: f.recipe.category,
        prepMinutes: f.recipe.prepMinutes,
        cookMinutes: f.recipe.cookMinutes,
      })),
    });
  });
}

export async function POST(req: Request) {
  return withUser(req, [], async ({ user }) => {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') ?? '';
    const recipe = await db.nutritionRecipe.findUnique({ where: { slug } });
    if (!recipe) return json({ favorite: false }, 404);
    const where = { userId_recipeId: { userId: user.id, recipeId: recipe.id } };
    const existing = await db.recipeFavorite.findUnique({ where });
    if (existing) {
      await db.recipeFavorite.delete({ where });
      return json({ favorite: false });
    }
    await db.recipeFavorite.create({ data: { userId: user.id, recipeId: recipe.id } });
    return json({ favorite: true });
  });
}
