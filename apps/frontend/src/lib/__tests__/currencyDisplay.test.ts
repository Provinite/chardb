import { describe, it, expect } from "vitest";
import { CurrencyTransactionKind } from "../../generated/graphql";
import {
  formatAmount,
  formatDelta,
  currencyTone,
  describeRow,
  collapseTransferLegs,
  netIssued,
  formatPrice,
  sumPrices,
  CURRENCY_KIND_LABEL,
} from "../currencyDisplay";

const HC = { code: "HC", symbol: null };
const GEM = { code: "GEM", symbol: "◆" };
const SS = { code: "SS", symbol: "✦" };

describe("formatAmount", () => {
  it("puts the code after the number when there is no symbol", () => {
    expect(formatAmount(250, HC)).toBe("250 HC");
  });

  it("puts the symbol in front when there is one", () => {
    // "◆250" and "250 HC" both read naturally; "GEM 250" does not.
    expect(formatAmount(250, GEM)).toBe("◆250");
  });

  it("groups thousands", () => {
    // A five-figure balance is unreadable without it.
    expect(formatAmount(1234567, HC)).toBe("1,234,567 HC");
  });

  it("renders a negative with a minus sign, not a bare hyphen", () => {
    expect(formatAmount(-40, HC)).toBe("−40 HC");
  });

  it("renders zero without a sign", () => {
    expect(formatAmount(0, HC)).toBe("0 HC");
  });
});

describe("formatDelta", () => {
  it("always shows the sign", () => {
    // "50 HC" in a statement is ambiguous in a way "+50 HC" is not.
    expect(formatDelta(50, HC)).toBe("+50 HC");
    expect(formatDelta(-50, HC)).toBe("−50 HC");
  });

  it("keeps the symbol in front of the magnitude, after the sign", () => {
    expect(formatDelta(-50, GEM)).toBe("−◆50");
  });
});

describe("currencyTone", () => {
  it("reads off the sign, not the kind", () => {
    // A transfer is a gain to one member and a loss to the other. The same
    // kind has to be able to read both ways.
    expect(currencyTone(10)).toBe("positive");
    expect(currencyTone(-10)).toBe("negative");
    expect(currencyTone(0)).toBe("neutral");
  });
});

describe("describeRow", () => {
  const other = { username: "ridley" };

  it("phrases a transfer from the row owner's side", () => {
    expect(
      describeRow({
        kind: CurrencyTransactionKind.Transfer,
        amount: -25,
        counterparty: other,
      }),
    ).toBe("Sent to @ridley");

    expect(
      describeRow({
        kind: CurrencyTransactionKind.Transfer,
        amount: 25,
        counterparty: other,
      }),
    ).toBe("Received from @ridley");
  });

  it("names the actor on a grant", () => {
    expect(
      describeRow({
        kind: CurrencyTransactionKind.Mint,
        amount: 50,
        actorUser: { username: "clove" },
      }),
    ).toBe("Granted by @clove");
  });

  it("falls back to the actor label when no user acted", () => {
    expect(
      describeRow({
        kind: CurrencyTransactionKind.Mint,
        amount: 50,
        actorLabel: "discord-bot",
      }),
    ).toBe("Granted by discord-bot");
  });

  it("says only that an imported balance predates the ledger", () => {
    // Inventing an origin would put fabricated history on a page members read.
    expect(
      describeRow({ kind: CurrencyTransactionKind.Import, amount: 100 }),
    ).toBe("Balance predates the ledger");
  });
});

describe("collapseTransferLegs", () => {
  const leg = (id: string, batchId: string, amount: number) => ({
    id,
    batchId,
    amount,
    kind: CurrencyTransactionKind.Transfer,
  });

  it("keeps one row per transfer batch", () => {
    const rows = [leg("a", "batch1", -25), leg("b", "batch1", 25)];

    // Both legs are visible at once in a community view, and showing them
    // separately makes one movement of coin look like two.
    expect(collapseTransferLegs(rows).map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps every row of a bulk grant, even though they share a batch", () => {
    const rows = [
      {
        id: "a",
        batchId: "b1",
        amount: 50,
        kind: CurrencyTransactionKind.Mint,
      },
      {
        id: "b",
        batchId: "b1",
        amount: 50,
        kind: CurrencyTransactionKind.Mint,
      },
      {
        id: "c",
        batchId: "b1",
        amount: 50,
        kind: CurrencyTransactionKind.Mint,
      },
    ];

    // Each recipient genuinely received their own coin. Rolling eleven people
    // into one line would hide who was paid.
    expect(collapseTransferLegs(rows)).toHaveLength(3);
  });

  it("does not merge two separate transfers between the same people", () => {
    const rows = [
      leg("a", "batch1", -25),
      leg("b", "batch1", 25),
      leg("c", "batch2", -25),
      leg("d", "batch2", 25),
    ];

    expect(collapseTransferLegs(rows).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("preserves order", () => {
    const rows = [
      { id: "m", batchId: "b0", amount: 5, kind: CurrencyTransactionKind.Mint },
      leg("a", "batch1", -25),
      leg("b", "batch1", 25),
      { id: "n", batchId: "b2", amount: 5, kind: CurrencyTransactionKind.Burn },
    ];

    expect(collapseTransferLegs(rows).map((r) => r.id)).toEqual([
      "m",
      "a",
      "n",
    ]);
  });
});

describe("netIssued", () => {
  it("nets grants against removals", () => {
    expect(
      netIssued([
        { kind: CurrencyTransactionKind.Mint, amount: 500 },
        { kind: CurrencyTransactionKind.Burn, amount: -100 },
        { kind: CurrencyTransactionKind.Spend, amount: -50 },
      ]),
    ).toBe(350);
  });

  it("ignores transfers, whose legs cancel", () => {
    // Coin moving between two members changes nobody's view of how much exists.
    expect(
      netIssued([
        { kind: CurrencyTransactionKind.Transfer, amount: -25 },
        { kind: CurrencyTransactionKind.Transfer, amount: 25 },
        { kind: CurrencyTransactionKind.Mint, amount: 100 },
      ]),
    ).toBe(100);
  });

  it("is zero over no rows", () => {
    expect(netIssued([])).toBe(0);
  });
});

describe("formatPrice", () => {
  it("renders a single-currency price as one amount", () => {
    expect(formatPrice([{ amount: 50, currency: HC }])).toBe("50 HC");
  });

  it("joins the currencies of one option with a plus", () => {
    // One option asking for two currencies is a price you pay all of, not a
    // choice between them -- "and", never "or".
    expect(
      formatPrice([
        { amount: 20, currency: HC },
        { amount: 1, currency: SS },
      ]),
    ).toBe("20 HC + ✦1");
  });

  it("keeps the order it was given", () => {
    // The order is the staff's, set in the price editor. Re-sorting it would
    // silently disagree with the admin page.
    expect(
      formatPrice([
        { amount: 1, currency: SS },
        { amount: 20, currency: HC },
      ]),
    ).toBe("✦1 + 20 HC");
  });

  it("says Free rather than rendering an empty string", () => {
    // A price with no components should never reach a member, but an empty
    // string in a button is a rendering bug that looks like a missing price.
    expect(formatPrice([])).toBe("Free");
  });
});

describe("sumPrices", () => {
  it("adds amounts of the same currency", () => {
    expect(
      sumPrices([
        [{ amount: 20, currency: HC }],
        [{ amount: 30, currency: HC }],
      ]),
    ).toEqual([{ currency: HC, amount: 50 }]);
  });

  it("keeps different currencies apart rather than adding them", () => {
    // Currencies never convert. A cart costing 20 HC and 1 SS has no single
    // total, and inventing one would be a lie about what is being spent.
    expect(
      sumPrices([
        [{ amount: 20, currency: HC }],
        [{ amount: 1, currency: SS }],
      ]),
    ).toEqual([
      { currency: HC, amount: 20 },
      { currency: SS, amount: 1 },
    ]);
  });

  it("totals a mixed cart per currency", () => {
    // Two potions at 20 HC + 1 SS, and one locket at 120 HC.
    const total = sumPrices([
      [
        { amount: 20, currency: HC },
        { amount: 1, currency: SS },
      ],
      [
        { amount: 20, currency: HC },
        { amount: 1, currency: SS },
      ],
      [{ amount: 120, currency: HC }],
    ]);

    expect(total).toEqual([
      { currency: HC, amount: 160 },
      { currency: SS, amount: 2 },
    ]);
  });

  it("orders by currency code, so a total does not reshuffle as lines change", () => {
    expect(
      sumPrices([
        [{ amount: 1, currency: SS }],
        [{ amount: 5, currency: GEM }],
      ]).map((t) => t.currency.code),
    ).toEqual(["GEM", "SS"]);
  });

  it("is empty for an empty cart", () => {
    expect(sumPrices([])).toEqual([]);
  });

  it("does not mutate the components it was given", () => {
    // The same price object is rendered on the listing and summed in the
    // cart; accumulating into it would make the listing's price grow.
    const price = [{ amount: 20, currency: HC }];
    sumPrices([price, price]);
    expect(price[0].amount).toBe(20);
  });
});

describe("CURRENCY_KIND_LABEL", () => {
  it("labels every kind, so a new one cannot render as undefined", () => {
    for (const kind of Object.values(CurrencyTransactionKind)) {
      expect(CURRENCY_KIND_LABEL[kind]).toBeTruthy();
    }
  });

  it("says Granted and Removed rather than Mint and Burn", () => {
    // Members are not reading a ledger schema.
    expect(CURRENCY_KIND_LABEL[CurrencyTransactionKind.Mint]).toBe("Granted");
    expect(CURRENCY_KIND_LABEL[CurrencyTransactionKind.Burn]).toBe("Removed");
  });
});
