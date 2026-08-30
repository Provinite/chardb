import { CurrencyTransactionKind } from "../generated/graphql";

/** A currency, as far as formatting is concerned. */
export interface DisplayCurrency {
  code: string;
  symbol?: string | null;
}

/**
 * Render an amount the way a member reads it.
 *
 * The symbol goes in front when there is one and the code after when there is
 * not, because "⬡250" and "250 HC" both read naturally while "HC 250" does not.
 * Thousands are grouped: a five-figure balance is unreadable without it, and
 * currency amounts here are always whole numbers.
 */
export function formatAmount(
  amount: number,
  currency: DisplayCurrency,
): string {
  const magnitude = Math.abs(amount).toLocaleString("en-US");
  const body = currency.symbol
    ? `${currency.symbol}${magnitude}`
    : `${magnitude} ${currency.code}`;
  return amount < 0 ? `−${body}` : body;
}

/**
 * Render a signed delta with an explicit sign.
 *
 * A ledger row's whole meaning is its direction, so the sign is never dropped
 * -- "50 HC" in a statement is ambiguous in a way "+50 HC" is not.
 */
export function formatDelta(amount: number, currency: DisplayCurrency): string {
  const sign = amount < 0 ? "−" : "+";
  const magnitude = Math.abs(amount).toLocaleString("en-US");
  return currency.symbol
    ? `${sign}${currency.symbol}${magnitude}`
    : `${sign}${magnitude} ${currency.code}`;
}

export const CURRENCY_KIND_LABEL: Record<CurrencyTransactionKind, string> = {
  [CurrencyTransactionKind.Mint]: "Granted",
  [CurrencyTransactionKind.Burn]: "Removed",
  [CurrencyTransactionKind.Transfer]: "Transfer",
  [CurrencyTransactionKind.Spend]: "Spent",
  [CurrencyTransactionKind.Import]: "Imported",
};

export type CurrencyTone = "positive" | "negative" | "neutral";

/**
 * How a row should read at a glance.
 *
 * Keyed off the signed amount rather than the kind, because a transfer is the
 * one kind that is both: the same event is a gain to one member and a loss to
 * the other, and each of them should see their own side.
 */
export function currencyTone(amount: number): CurrencyTone {
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "neutral";
}

/** Minimal shape a statement row needs to be described in a sentence. */
export interface DescribableRow {
  kind: CurrencyTransactionKind;
  amount: number;
  counterparty?: { username: string } | null;
  actorUser?: { username: string } | null;
  actorLabel?: string | null;
}

/**
 * Phrase one statement row from the row-owner's point of view.
 *
 * Phrased per kind rather than shown as a raw from/to pair: "Sent to @ridley"
 * and "Received from @ridley" are the same database row seen from two sides,
 * and showing both members "ridley → clove" makes each of them work out which
 * one they are.
 */
export function describeRow(row: DescribableRow): string {
  const actor = row.actorUser?.username
    ? `@${row.actorUser.username}`
    : (row.actorLabel ?? "the system");
  const other = row.counterparty?.username
    ? `@${row.counterparty.username}`
    : "another member";

  switch (row.kind) {
    case CurrencyTransactionKind.Mint:
      return `Granted by ${actor}`;
    case CurrencyTransactionKind.Burn:
      return `Removed by ${actor}`;
    case CurrencyTransactionKind.Transfer:
      return row.amount < 0 ? `Sent to ${other}` : `Received from ${other}`;
    case CurrencyTransactionKind.Spend:
      return "Spent";
    case CurrencyTransactionKind.Import:
      // Says only that the balance predates the ledger. Inventing an origin
      // would put fabricated history on a page members can read.
      return "Balance predates the ledger";
    default:
      return "Moved";
  }
}

/**
 * Collapse the two legs of a transfer into one row for a community-wide view.
 *
 * A transfer writes one row per side so each member's own statement reads
 * correctly. In a community ledger both legs are visible at once, and showing
 * them separately makes one movement of coin look like two.
 *
 * Only transfers are collapsed. A bulk mint shares a batch id too, but each
 * recipient genuinely received their own coin, and rolling eleven people into
 * one line would hide who was paid.
 */
export function collapseTransferLegs<
  T extends {
    id: string;
    kind: CurrencyTransactionKind;
    amount: number;
    batchId: string;
  },
>(rows: T[]): T[] {
  const seenTransferBatches = new Set<string>();
  return rows.filter((row) => {
    if (row.kind !== CurrencyTransactionKind.Transfer) return true;
    if (seenTransferBatches.has(row.batchId)) return false;
    seenTransferBatches.add(row.batchId);
    return true;
  });
}

/**
 * Total minted minus total removed, over whatever rows are loaded.
 *
 * Transfers are excluded because their legs cancel: coin moving between two
 * members changes nobody's view of how much exists.
 */
export function netIssued(
  rows: Array<{ kind: CurrencyTransactionKind; amount: number }>,
): number {
  return rows.reduce((total, row) => {
    if (row.kind === CurrencyTransactionKind.Transfer) return total;
    return total + row.amount;
  }, 0);
}

/** One currency and how much of it a price asks for. */
export interface PriceComponent {
  amount: number;
  currency: DisplayCurrency;
}

/**
 * Render a whole price option.
 *
 * Several components is one price asking for several currencies at once --
 * "2 Clover and 1 Star" -- so they are joined with "and" rather than a list
 * separator. A comma would read as a choice between them, which is exactly
 * what a different price option is.
 */
export function formatPrice(components: PriceComponent[]): string {
  if (components.length === 0) return "Free";
  return components.map((c) => formatAmount(c.amount, c.currency)).join(" + ");
}

/**
 * Add up a cart's cost, per currency.
 *
 * Currencies never convert into one another, so a total is a set of amounts
 * rather than a number. Anything that reduced this to one figure would be
 * inventing an exchange rate.
 */
export function sumPrices(
  prices: PriceComponent[][],
): Array<{ currency: DisplayCurrency; amount: number }> {
  const byCode = new Map<
    string,
    { currency: DisplayCurrency; amount: number }
  >();
  for (const components of prices) {
    for (const component of components) {
      const existing = byCode.get(component.currency.code);
      if (existing) {
        existing.amount += component.amount;
      } else {
        byCode.set(component.currency.code, {
          currency: component.currency,
          amount: component.amount,
        });
      }
    }
  }
  return [...byCode.values()].sort((a, b) =>
    a.currency.code < b.currency.code ? -1 : 1,
  );
}
