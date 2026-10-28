import { z } from "zod";

/**
 * What a candy board can be called: a first word, an optional joiner and a
 * last word, each picked from its list -- "Moonlit von Pumpkin", "Spooky
 * Cauldron". Words are as shown: first and last in title case, joiners in
 * lowercase. A few words are in both lists.
 */

export const BOARD_NAME_FIRST_WORDS = [
  // Halloween, and sweets.
  "Spooky",
  "Moonlit",
  "Haunted",
  "Wobbly",
  "Sugary",
  "Crooked",
  "Midnight",
  "Gloomy",
  "Sticky",
  "Velvet",
  "Pumpkin",
  "Candlelit",
  "Whispering",
  "Creaky",
  "Ghostly",
  "Gummy",
  "Bat",
  "Cobweb",
  "Lantern",
  "Jolly",
  "Peculiar",
  "Sleepy",
  "Starry",
  "Witchy",
  "Caramel",
  // Harvest and nature.
  "Golden",
  "Rustling",
  "Mossy",
  "Frosty",
  "Misty",
  "Thorny",
  "Acorn",
  "Amber",
  "Maple",
  "Orchard",
  "Bramble",
  "Twilight",
  "Wild",
  "Dewy",
  "Cinnamon",
  // The senses.
  "Hazy",
  "Crisp",
  "Rough",
  "Tacky",
  "Fuzzy",
  "Smoky",
  "Spiced",
  "Toasty",
  "Crunchy",
  "Prickly",
  // Clovercoin's own.
  "Clover",
] as const;

export const BOARD_NAME_JOINERS = [
  "of",
  "von",
  "con",
  "de",
  "du",
  "del",
  "la",
  "and",
  "'n'",
  "y",
  "upon",
  "from",
  "in the",
  "under the",
  "beyond the",
  "à la",
] as const;

export const BOARD_NAME_LAST_WORDS = [
  // Halloween, and sweets.
  "Pumpkin",
  "Cauldron",
  "Lantern",
  "Hollow",
  "Manor",
  "Gumdrop",
  "Goblin",
  "Cobweb",
  "Crypt",
  "Toffee",
  "Graveyard",
  "Bat",
  "Moon",
  "Broomstick",
  "Scarecrow",
  "Hootenanny",
  "Shenanigans",
  "Marshmallow",
  "Bonbon",
  "Spectre",
  "Wonderland",
  "Treasury",
  "Stash",
  "Hoard",
  "Delight",
  // Harvest and nature.
  "Harvest",
  "Orchard",
  "Haystack",
  "Bramble",
  "Acorn",
  "Toadstool",
  "Meadow",
  "Thicket",
  "Bonfire",
  "Gourd",
  "Cornfield",
  "Squash",
  "Thistle",
  "Burrow",
  "Cider",
  "Twilight",
  // The senses, and the rest.
  "Scent",
  "Whisper",
  "Hush",
  "Crunch",
  "Glimmer",
  "Pantry",
  "Mischief",
  "Lullaby",
  "Nook",
  // Clovercoin's own.
  "Coin",
] as const;

/**
 * The board's nameplate, a banner with its name on it, is placed as a candy
 * is, under this id: knock ids start at 1, so no candy has it. It can go on
 * a board that has a name, once, and is hidden while the board has none.
 */
export const NAMEPLATE_ID = 0;

/** A name to give a board: checked against the lists. */
export const boardNameSchema = z.object({
  first: z.enum(BOARD_NAME_FIRST_WORDS),
  joiner: z.enum(BOARD_NAME_JOINERS).nullable(),
  last: z.enum(BOARD_NAME_LAST_WORDS),
});

/**
 * A board's saved name: any words, so a word since taken off a list still
 * shows on the boards already called by it.
 */
export const storedBoardNameSchema = z.object({
  first: z.string(),
  joiner: z.string().nullable(),
  last: z.string(),
});

export type BoardName = z.infer<typeof storedBoardNameSchema>;
