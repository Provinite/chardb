/**
 * The house's side of the candy swap: Daphne and Luther, the event's hosts,
 * put up offers of their own that give three candies for one. The candy paid
 * goes nowhere and the three are new, so every house trade adds candy.
 *
 * Each host buys back a kind of their own and pays in the other's: Luther
 * takes a dark or tricksy candy and gives three of Daphne's, and the reverse.
 */

export const HALLOWEEN_HOSTS = ["Daphne", "Luther"] as const;
export type HalloweenHost = (typeof HALLOWEEN_HOSTS)[number];

export function isHalloweenHost(value: unknown): value is HalloweenHost {
  return HALLOWEEN_HOSTS.some((host) => host === value);
}

/** The host whose candies a host pays in. */
export function otherHost(host: HalloweenHost): HalloweenHost {
  return host === "Daphne" ? "Luther" : "Daphne";
}

/** Every candy kind, by slug, under the host it belongs to. */
export const HOST_CANDIES: Record<HalloweenHost, readonly string[]> = {
  Daphne: [
    "admit-one-ticket",
    "banana",
    "berry-tart",
    "big-candy-corn",
    "blue-orange-twist",
    "bowed-candy-canes",
    "bronze-medal",
    "candied-apple-slices",
    "candy-corn-pile",
    "candy-corn",
    "candy-pile",
    "caramel-apple",
    "caramel-chunk",
    "caramel-cubes",
    "caramel-oval",
    "cloverse-tcg-pack",
    "crossed-soda-bottles",
    "daphne-head",
    "daphne-heehee",
    "daphne-lantern",
    "daphne-treat",
    "first-place-ribbon",
    "floral-macarons",
    "golden-cookies",
    "golden-pastry",
    "green-apple",
    "green-bottle-candy",
    "gummy-bears",
    "jelly-beans",
    "juice-boxes",
    "marshmallow",
    "orange-lollipop",
    "orange-swirl-lollipop",
    "orange-wrapped-candy",
    "pastel-gumdrops",
    "pastel-splat-discs",
    "pillow-cases-wrapper",
    "princess-sized-candybar",
    "pumpkin-cookies",
    "pumpkin-lollipop",
    "pumpkin-pie-plate",
    "pumpkin-pie-slice",
    "pumpkin-pops",
    "pumpkin-yoyo",
    "purple-gem-candy",
    "rainbow-lollipop",
    "rainbow-roll",
    "rainbow-twist",
    "red-apple",
    "red-blue-sticks",
    "red-swirl-disc",
    "rock-candy",
    "second-place-ribbon",
    "silver-medal",
    "speckled-peach",
    "splatter-ball",
    "strawberry-bag",
    "strawberry-cheesecake",
    "striped-sticks",
    "taffy-wrappers",
    "tanghulu-skewer",
    "third-place-ribbon",
    "too-much-candycorn",
    "treat-card",
    "tricolor-sticks",
    "winged-splatter",
    "wrapped-candies",
    "wrapped-candy-row",
    "yellow-flower-bouquet",
  ],
  Luther: [
    "all-day-sucker",
    "bitten-pumpkin",
    "black-cat-cookie",
    "bone-candy",
    "boo-banana-ghost",
    "boo-treat-bag",
    "brown-bug-candy",
    "candy-ghosts",
    "chest-mimic",
    "chocolate-marshmallow-pumpkins",
    "chocolate-muffin",
    "chocolate-nut-cupcake",
    "chocolate-strawberry",
    "cracked-egg",
    "crushed-soda-can",
    "dust-bunny",
    "eyeball-candy",
    "eyeball-gumballs",
    "firecrackers",
    "flaming-marshmallow",
    "galaxy-cake-pop",
    "ghost-cookie",
    "ghost-sugar-cookie",
    "ghost-trio",
    "gingerbread-skeleton",
    "gray-thumbtack",
    "green-gummy-worm",
    "green-wrapped-candy",
    "grinning-pumpkin",
    "gummy-bats",
    "gummy-worm-cup",
    "gummy-worm-pile",
    "gummy-worms",
    "jack-o-lantern-bucket",
    "luther-head",
    "luther-hehe",
    "luther-sticker",
    "mint-chocolate-nest",
    "mummy-grub",
    "mystery-flavored-ghosts",
    "pb-cup",
    "pretzel-broom",
    "pretzel-cookie",
    "pumpkin-bow-pop",
    "purple-ghost",
    "red-candy-apple",
    "red-paw-gummy",
    "red-rose",
    "red-thumbtack",
    "red-yellow-worm",
    "salt-candy",
    "skull-bone-pop",
    "skull-candy",
    "skull-gummies",
    "spooky-popcorn",
    "striped-party-hat",
    "swamp-salad-pouch",
    "tesla-cannon-slime-bar",
    "toilet-paper",
    "trick-tree",
    "tricked-card",
    "truffle-box",
    "twisted-sticks",
    "vampire-lips",
    "white-lollipop",
    "white-strawberry",
    "witch-frog",
    "wooden-plank",
  ],
};

/** How many candies a house offer gives. */
export const HOUSE_OFFER_CANDIES = 3;
/** How often the house puts up an offer on its own. */
export const HOUSE_SPAWN_INTERVAL_MS = 5 * 60_000;
/**
 * The most house offers open before the house stops adding them itself: one
 * per candy kind.
 */
export const MAX_OPEN_HOUSE_OFFERS = HALLOWEEN_HOSTS.reduce(
  (total, host) => total + HOST_CANDIES[host].length,
  0,
);
/**
 * How long a house offer stays open. One interval per open offer, so an
 * untouched full pool rolls over: the oldest expires as the newest arrives.
 */
export const HOUSE_OFFER_LIFETIME_MS =
  MAX_OPEN_HOUSE_OFFERS * HOUSE_SPAWN_INTERVAL_MS;
/**
 * The most offers one top-up puts up. The top-up runs inside a browse, so a
 * long quiet stretch catches up on its latest ticks only.
 */
export const MAX_HOUSE_CATCH_UP = 20;
/** The most offers one manual drop puts up. */
export const MAX_HOUSE_DROP = 50;

/**
 * When the house's due offers are dated: one per interval since its last
 * offer, the latest first kept, skipping any already expired and stopping at
 * the cap or the catch-up batch. One at `now` if it has never offered.
 */
export function dueHouseSpawns(
  lastSpawnAt: Date | null,
  now: Date,
  open: number,
): Date[] {
  const room = Math.min(MAX_OPEN_HOUSE_OFFERS - open, MAX_HOUSE_CATCH_UP);
  if (room <= 0) return [];
  if (!lastSpawnAt) return [now];
  const due: Date[] = [];
  const oldest = now.getTime() - HOUSE_OFFER_LIFETIME_MS;
  const missed = Math.floor(
    (now.getTime() - lastSpawnAt.getTime()) / HOUSE_SPAWN_INTERVAL_MS,
  );
  for (let k = missed; k >= 1 && due.length < room; k--) {
    const at = lastSpawnAt.getTime() + k * HOUSE_SPAWN_INTERVAL_MS;
    if (at <= oldest) break;
    due.unshift(new Date(at));
  }
  return due;
}

/** A candy a host may ask for. */
export interface HouseWant {
  host: HalloweenHost;
  slug: string;
}

/**
 * The wants the house picks its next ask from: of every kind each host may
 * ask for, those the open offers ask for least. Every possible want is asked
 * for once before any is asked for twice.
 *
 * @param asked How many open house offers ask for each kind.
 */
export function leastAskedWants(
  pools: Record<HalloweenHost, readonly string[]>,
  asked: ReadonlyMap<string, number>,
): HouseWant[] {
  const wants = HALLOWEEN_HOSTS.flatMap((host) =>
    pools[host].map((slug) => ({ host, slug })),
  );
  const count = (want: HouseWant) => asked.get(want.slug) ?? 0;
  const least = Math.min(...wants.map(count));
  return wants.filter((want) => count(want) === least);
}
