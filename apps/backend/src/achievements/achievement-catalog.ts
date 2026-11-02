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

/** Completed candy swaps that earn a trader achievement, lowest first. */
export const CANDY_TRADE_TIERS = [5, 15, 30] as const;
export type CandyTradeTier = (typeof CANDY_TRADE_TIERS)[number];

/** The slugs of what playing Trick-or-Treat earns, for one year's event. */
export function halloweenPlaySlug(year: number) {
  return {
    candyTrades: (tier: CandyTradeTier) => `candy-trades-${tier}-${year}`,
    generousOffer: `generous-offer-${year}`,
    bargainHunter: `bargain-hunter-${year}`,
    treatYourself: `treat-yourself-${year}`,
    everyNight: `every-night-${year}`,
    nobodyHome: `nobody-home-${year}`,
    infectiousEnthusiasm: `infectious-enthusiasm-${year}`,
  };
}

const play2026 = halloweenPlaySlug(2026);

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    slug: trickOrTreaterSlug(2026),
    name: "Trick-or-Treater 2026",
    description: "Signed in during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/big-candy-corn.png",
  },
  {
    slug: play2026.candyTrades(5),
    name: "Candy Swapper 2026",
    description: "Completed 5 candy swaps during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/bronze-medal.png",
  },
  {
    slug: play2026.candyTrades(15),
    name: "Candy Trader 2026",
    description: "Completed 15 candy swaps during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/silver-medal.png",
  },
  {
    slug: play2026.candyTrades(30),
    name: "Candy Baron 2026",
    description: "Completed 30 candy swaps during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/first-place-ribbon.png",
  },
  {
    slug: play2026.generousOffer,
    name: "Generous Offer 2026",
    description: "Offered 3 candies for 1 during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/candy-pile.png",
  },
  {
    slug: play2026.bargainHunter,
    name: "Bargain Hunter 2026",
    description: "Took a 3-for-1 candy offer during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/too-much-candycorn.png",
  },
  {
    slug: play2026.treatYourself,
    name: "Treat Yourself 2026",
    description: "Sent yourself a gifty during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/boo-treat-bag.png",
  },
  {
    slug: play2026.everyNight,
    name: "Every Night 2026",
    description: "Knocked on every day of Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/jack-o-lantern-bucket.png",
  },
  {
    slug: play2026.nobodyHome,
    name: "Nobody Home 2026",
    description: "Knocked with no knocks left during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/toilet-paper.png",
  },
  {
    slug: play2026.infectiousEnthusiasm,
    name: "Infectious Enthusiasm 2026",
    description:
      "Caught it by swapping candy with someone who had it during Trick-or-Treat 2026.",
    imagePath: "/halloween/candy/firecrackers.png",
  },
];

const BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

export function findAchievement(
  slug: string,
): AchievementDefinition | undefined {
  return BY_SLUG.get(slug);
}
