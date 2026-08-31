import { registerEnumType } from "@nestjs/graphql";
import type { Prisma } from "@chardb/database";

/**
 * The ways an owner can say they are open to being asked about a character.
 *
 * Stored as one boolean column each rather than a set, because that is what
 * the two original flags already were and because each is independently
 * filterable without a join. This enum exists so the filter can name them as a
 * list -- "show me anything free or open to offers" -- which columns alone
 * cannot express.
 *
 * All of these are advertisements except `TRADE_CHARACTERS`. They say what an
 * owner will entertain and leave the arranging to a comment thread, because
 * that is what the things they describe are: nothing here settles a character
 * for a piece of art. `TRADE_CHARACTERS` is backed by `Character.isTradeable`,
 * which the trade system reads at propose and again at settlement, so it is
 * consent to a real transfer. Keeping it in the same list is a convenience for
 * browsing, not a claim that the six mean the same kind of thing.
 */
export enum CharacterAvailability {
  /** For sale, in real money. Paired with `Character.price`. */
  FOR_SALE = "FOR_SALE",
  /** For sale, in a community's own currency. */
  FOR_SALE_COIN = "FOR_SALE_COIN",
  /** Open to trades for other characters. The one with a mechanism behind it. */
  TRADE_CHARACTERS = "TRADE_CHARACTERS",
  /** Open to trades for art. */
  TRADE_ART = "TRADE_ART",
  /** Open to offers, without saying in advance what kind. */
  OFFERS = "OFFERS",
  /** Free to a good home. */
  FREEBIE = "FREEBIE",
}

registerEnumType(CharacterAvailability, {
  name: "CharacterAvailability",
  description:
    "A way an owner has said they are open to being asked about a " +
    "character. All are advertisements except TRADE_CHARACTERS, which the " +
    "trade system enforces.",
});

/**
 * Which column each kind is stored in.
 *
 * One place, so the filter and anything else that has to cross between the two
 * cannot drift into disagreeing about which flag is which.
 */
export const AVAILABILITY_COLUMN = {
  [CharacterAvailability.FOR_SALE]: "isSellable",
  [CharacterAvailability.FOR_SALE_COIN]: "isSellableForCoin",
  [CharacterAvailability.TRADE_CHARACTERS]: "isTradeable",
  [CharacterAvailability.TRADE_ART]: "isTradeableForArt",
  [CharacterAvailability.OFFERS]: "isOpenToOffers",
  [CharacterAvailability.FREEBIE]: "isFreebie",
} as const satisfies Record<CharacterAvailability, keyof Prisma.CharacterWhereInput>;

/**
 * "Any of these", which is what a row of checkboxes means.
 *
 * Ticking sale and freebie asks for characters that are either, not characters
 * that are somehow both -- an AND of these would return nothing for most
 * combinations and read as a broken filter rather than a strict one.
 *
 * An empty list is no filter at all rather than a filter matching nothing, so
 * unticking the last box returns the member to browsing everything.
 */
export function availabilityWhere(
  kinds: CharacterAvailability[] | undefined,
): Prisma.CharacterWhereInput {
  if (!kinds?.length) return {};
  return {
    OR: [...new Set(kinds)].map((kind) => ({
      [AVAILABILITY_COLUMN[kind]]: true,
    })),
  };
}
