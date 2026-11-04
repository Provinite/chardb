import { CharacterAvailability } from "../generated/graphql";

/**
 * The six ways an owner can say they are open to being asked about a
 * character, in the order they are shown everywhere.
 *
 * One list, because the same six appear on the create form, the edit form, the
 * character page's badges and the search filter. Four copies of the wording
 * would drift, and the wording is the whole of what these mean to a member --
 * there is no behaviour behind most of them to correct a misleading label.
 */
export interface AvailabilityKind {
  /** The enum the filter sends. */
  value: CharacterAvailability;
  /** The boolean column on Character, and the form field name. */
  field:
    | "isSellable"
    | "isSellableForCoin"
    | "isTradeable"
    | "isTradeableForArt"
    | "isOpenToOffers"
    | "isFreebie";
  /** On the edit forms and the filter, where there is room to be plain. */
  label: string;
  /** On the character page, where it is a badge and space is short. */
  badge: string;
  /** Mid-sentence, after "is now" or "is no longer", in a notification. */
  phrase: string;
}

export const AVAILABILITY_KINDS: readonly AvailabilityKind[] = [
  {
    value: CharacterAvailability.ForSale,
    field: "isSellable",
    label: "For sale (money)",
    badge: "For Sale",
    phrase: "for sale",
  },
  {
    value: CharacterAvailability.ForSaleCoin,
    field: "isSellableForCoin",
    label: "For sale (community currency)",
    badge: "For Sale (coin)",
    phrase: "for sale for community currency",
  },
  {
    value: CharacterAvailability.TradeCharacters,
    field: "isTradeable",
    label: "Open to trades for other characters",
    badge: "Open to Trades",
    phrase: "open to trades for other characters",
  },
  {
    value: CharacterAvailability.TradeArt,
    field: "isTradeableForArt",
    label: "Open to trades for art",
    badge: "Trades for Art",
    phrase: "open to trades for art",
  },
  {
    value: CharacterAvailability.Offers,
    field: "isOpenToOffers",
    label: "Open to offers",
    badge: "Open to Offers",
    phrase: "open to offers",
  },
  {
    value: CharacterAvailability.Freebie,
    field: "isFreebie",
    label: "Free to a good home",
    badge: "Freebie",
    phrase: "free to a good home",
  },
] as const;

/**
 * What ticking "open to trades for other characters" actually commits you to,
 * shown next to that one box.
 *
 * It is the only one of the six with a mechanism behind it, so it is the only
 * one where ticking the box lets somebody else start something. The rest are
 * advertisements and the arranging happens in the comments; nobody should have
 * to discover the difference by being sent an offer.
 */
export const TRADE_CHARACTERS_NOTE =
  "Lets members put this character on a trade table. The others are notices " +
  "— they say what you will consider, and anyone interested has to ask.";

/** Every kind the character has set, in list order. */
export function setKinds(
  character: Partial<Record<AvailabilityKind["field"], boolean>>,
): AvailabilityKind[] {
  return AVAILABILITY_KINDS.filter((kind) => character[kind.field]);
}
