import { describe, it, expect } from "vitest";
import { buildTraitOrder, sortByTraitOrder } from "../traitOrder";

/**
 * The bug this guards against: character traits rendered in the order the JSON
 * array happened to be written, so reordering a variant's trait list left every
 * existing character showing the old order.
 */

const ids = (items: Array<{ traitId: string }>) => items.map((i) => i.traitId);
const traitId = (item: { traitId: string }) => item.traitId;

describe("buildTraitOrder", () => {
  it("maps each trait to its position", () => {
    // traitsBySpecies returns them already sorted by TraitListEntry.order, so
    // position in the array is the order.
    expect(buildTraitOrder([{ id: "eyes" }, { id: "ears" }])).toEqual(
      new Map([
        ["eyes", 0],
        ["ears", 1],
      ]),
    );
  });

  it("is empty for no traits", () => {
    expect(buildTraitOrder([]).size).toBe(0);
  });
});

describe("sortByTraitOrder", () => {
  const order = buildTraitOrder([
    { id: "ears" },
    { id: "eyes" },
    { id: "tail" },
  ]);

  it("puts values in the variant's order, not the stored order", () => {
    const stored = [
      { traitId: "tail" },
      { traitId: "ears" },
      { traitId: "eyes" },
    ];

    expect(ids(sortByTraitOrder(stored, traitId, order))).toEqual([
      "ears",
      "eyes",
      "tail",
    ]);
  });

  it("leaves an already-correct list alone", () => {
    const stored = [
      { traitId: "ears" },
      { traitId: "eyes" },
      { traitId: "tail" },
    ];

    expect(ids(sortByTraitOrder(stored, traitId, order))).toEqual([
      "ears",
      "eyes",
      "tail",
    ]);
  });

  it("sorts a trait the variant no longer lists to the end, rather than dropping it", () => {
    // A trait removed from the variant still has a value on characters saved
    // before the removal. Hiding it during a masterlist review would be worse
    // than showing it out of place.
    const stored = [
      { traitId: "retired" },
      { traitId: "tail" },
      { traitId: "ears" },
    ];

    expect(ids(sortByTraitOrder(stored, traitId, order))).toEqual([
      "ears",
      "tail",
      "retired",
    ]);
  });

  it("keeps unlisted traits in their existing relative order", () => {
    const stored = [
      { traitId: "gone-b" },
      { traitId: "eyes" },
      { traitId: "gone-a" },
    ];

    expect(ids(sortByTraitOrder(stored, traitId, order))).toEqual([
      "eyes",
      "gone-b",
      "gone-a",
    ]);
  });

  it("changes nothing when the ordering has not loaded yet", () => {
    // The components render in stored order until the ordering query resolves.
    // An empty map must not reshuffle them.
    const stored = [
      { traitId: "tail" },
      { traitId: "ears" },
      { traitId: "eyes" },
    ];

    expect(ids(sortByTraitOrder(stored, traitId, new Map()))).toEqual([
      "tail",
      "ears",
      "eyes",
    ]);
  });

  it("is stable across repeats of one trait", () => {
    // Multi-value traits group before this runs, but nothing here should
    // depend on that.
    const stored = [
      { traitId: "eyes", v: 1 },
      { traitId: "ears", v: 2 },
      { traitId: "eyes", v: 3 },
    ];

    expect(sortByTraitOrder(stored, traitId, order).map((s) => s.v)).toEqual([
      2, 1, 3,
    ]);
  });

  it("does not mutate what it was given", () => {
    const stored = [{ traitId: "tail" }, { traitId: "ears" }];
    sortByTraitOrder(stored, traitId, order);
    expect(ids(stored)).toEqual(["tail", "ears"]);
  });

  it("handles an empty list", () => {
    expect(sortByTraitOrder([], traitId, order)).toEqual([]);
  });
});
