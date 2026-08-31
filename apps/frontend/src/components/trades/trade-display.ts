import {
  EffectiveTradeStatus,
  type TradeFieldsFragment,
} from "../../graphql/trades.graphql";

type ItemLine = TradeFieldsFragment["items"][number];
type CharacterLine = TradeFieldsFragment["characterLines"][number];
type CoinLine = TradeFieldsFragment["currencyLines"][number];

/** One half of a trade: everything moving one way. */
export interface TradeSide {
  items: ItemLine[];
  characters: CharacterLine[];
  coin: CoinLine[];
}

/** The two halves of a trade, from one viewer's point of view. */
export interface TradeSides {
  giving: TradeSide;
  receiving: TradeSide;
}

/**
 * Split a trade into what the viewer hands over and what they get.
 *
 * Lines carry a source and a destination rather than a side, so which half a
 * line belongs to depends on who is looking. This is the only place that
 * decides that, so the composer, the offer page and the inbox cannot disagree
 * about which way an offer points.
 */
export function sidesFor(
  trade: TradeFieldsFragment,
  viewerId: string,
): TradeSides {
  return {
    giving: {
      items: trade.items.filter((l) => l.sourceUser.id === viewerId),
      characters: trade.characterLines.filter(
        (l) => l.sourceUser.id === viewerId,
      ),
      coin: trade.currencyLines.filter((l) => l.sourceUser.id === viewerId),
    },
    receiving: {
      items: trade.items.filter((l) => l.destinationUser.id === viewerId),
      characters: trade.characterLines.filter(
        (l) => l.destinationUser.id === viewerId,
      ),
      coin: trade.currencyLines.filter(
        (l) => l.destinationUser.id === viewerId,
      ),
    },
  };
}

/**
 * What one line is called: a named row, or a quantity of a type.
 *
 * A row line carries no type of its own -- it points at one particular item --
 * so its name comes from the item it pins. Falling through to "1 item" left the
 * recipient reading an offer that never said what was in it.
 */
export function describeLine(line: ItemLine): string {
  if (line.itemType && line.quantity) {
    return line.quantity > 1
      ? `${line.quantity} × ${line.itemType.name}`
      : line.itemType.name;
  }
  return line.item?.itemType.name ?? "an item";
}

/**
 * What a character line is called.
 *
 * Just the name, and no quantity: there is one of each character, so a count
 * would be a number that is always 1 and reads as though it might not be.
 */
export function describeCharacter(line: CharacterLine): string {
  return line.character.name;
}

/** "250 HC", using the code when there is no symbol. */
export function describeCoin(line: CoinLine): string {
  const unit = line.currency.symbol || line.currency.code;
  return `${line.amount.toLocaleString()} ${unit}`;
}

/** A one-line summary of a side, for a list row. */
export function summariseSide(side: TradeSide): string {
  const parts = [
    ...side.items.map(describeLine),
    ...side.characters.map(describeCharacter),
    ...side.coin.map(describeCoin),
  ];
  if (parts.length === 0) return "nothing";
  if (parts.length <= 2) return parts.join(" and ");
  return `${parts[0]} and ${parts.length - 1} more`;
}

/** Whether this viewer can still act on the offer, and how. */
export function actionsFor(
  trade: TradeFieldsFragment,
  viewerId: string,
): { canRespond: boolean; canCancel: boolean } {
  const open = trade.status === EffectiveTradeStatus.Pending;
  return {
    canRespond: open && trade.recipient.id === viewerId,
    canCancel: open && trade.proposer.id === viewerId,
  };
}

/** How a status reads to a member. */
export const STATUS_LABEL: Record<EffectiveTradeStatus, string> = {
  [EffectiveTradeStatus.Pending]: "Awaiting an answer",
  [EffectiveTradeStatus.Accepted]: "Settled",
  [EffectiveTradeStatus.Declined]: "Declined",
  [EffectiveTradeStatus.Cancelled]: "Withdrawn",
  [EffectiveTradeStatus.Expired]: "Expired",
};

/** "in 5 days", or "expired" once it has lapsed. */
export function describeExpiry(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.round(ms / 86_400_000);
  if (days >= 1) return `in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.round(ms / 3_600_000));
  return `in ${hours} hour${hours === 1 ? "" : "s"}`;
}
