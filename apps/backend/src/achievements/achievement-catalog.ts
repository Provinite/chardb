/**
 * Every achievement a user can earn. A `UserAchievement` row names one by
 * `slug`; what it is called and how it looks is read from here, so a rename
 * reaches everyone who already has it.
 */
export interface AchievementDefinition {
  slug: string;
  name: string;
  description: string;
  /** Served by the frontend, from its `public` directory. */
  imagePath: string;
}

export function trickOrTreaterSlug(year: number): string {
  return `trick-or-treater-${year}`;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    slug: trickOrTreaterSlug(2026),
    name: "Trick-or-Treater 2026",
    description: "Signed in during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/big-candy-corn.png",
  },
];

const BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

export function findAchievement(
  slug: string,
): AchievementDefinition | undefined {
  return BY_SLUG.get(slug);
}
