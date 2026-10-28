import { z } from "zod";
import {
  BOARD_NAME_FIRST_WORDS,
  BOARD_NAME_JOINERS,
  BOARD_NAME_LAST_WORDS,
} from "@chardb/shared";

/**
 * What a candy board can be called: a first word, an optional joiner and a
 * last word, each from its list in @chardb/shared, which the frontend offers
 * them from.
 */

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
