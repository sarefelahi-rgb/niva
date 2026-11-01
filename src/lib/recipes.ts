/**
 * NIVA recipe-safety rules — Wave 17 (features 5/7/8).
 * Server + client shared constants. The UI can decorate, never bypass, these.
 */

/** Allergen vocabulary (subset of typical major allergens; honey is separate). */
export const ALLERGENS = ['EGG', 'MILK', 'GLUTEN', 'NUTS', 'PEANUT', 'FISH', 'SOY', 'SESAME'] as const;
export type Allergen = (typeof ALLERGENS)[number];

/** Foods that must never appear in child-facing recipes per §8.9. */
export const BANNED_ALLERGENS_FOR_CHILD: string[] = ['HONEY'];

/** Allergen label keys for i18n (`allergen.<code>`). */
export function allergenKey(a: string): string {
  return `allergen.${a.toLowerCase()}`;
}

export interface SafetyFlags {
  /** Honey prohibition active (child < 12 months). */
  honeyBan: boolean;
  /** Cow milk as main drink prohibition active (child < 12 months). */
  cowMilkBan: boolean;
  /** No solid-recipe program (child < ~6 months). */
  preSolidOnly: boolean;
  /** Adult supervision reminder active (always true for children). */
  supervision: boolean;
}

export function buildSafetyFlags(opts: { underTwelveMonths: boolean; preSolid: boolean }): SafetyFlags {
  return {
    honeyBan: opts.underTwelveMonths,
    cowMilkBan: opts.underTwelveMonths,
    preSolidOnly: opts.preSolid,
    supervision: true,
  };
}

/** Meal-type vocabulary for filters. */
export const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;
export type Meal = (typeof MEALS)[number];

export function mealKey(m: string): string {
  return `meal.${m.toLowerCase()}`;
}

/** Display categories for chips (i18n keys `nut.cat.<id>`). */
export const CHILD_CATEGORIES = ['puree', 'porridge', 'soup', 'lunch', 'dinner', 'breakfast', 'snack', 'protein', 'iron', 'finger'] as const;
export const MOTHER_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack', 'protein', 'iron', 'calcium', 'fiber', 'quick', 'recovery'] as const;
