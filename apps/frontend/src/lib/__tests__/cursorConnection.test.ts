import { describe, it, expect } from "vitest";
import { mergeCursorPage } from "../cursorConnection";

const page = (ids: string[], hasNextPage: boolean) => ({
  nodes: ids.map((id) => ({ id })),
  totalCount: 9,
  hasNextPage,
});

describe("mergeCursorPage", () => {
  it("replaces what is cached when the page has no cursor", () => {
    const merged = mergeCursorPage(
      page(["a", "b"], true),
      page(["c"], false),
      null,
    );

    expect(merged).toEqual(page(["c"], false));
  });

  it("appends a page fetched after a cursor", () => {
    const merged = mergeCursorPage(
      page(["a", "b"], true),
      page(["c", "d"], false),
      "b",
    );

    expect(merged.nodes.map((n) => n.id)).toEqual(["a", "b", "c", "d"]);
    expect(merged.hasNextPage).toBe(false);
  });

  it("starts from the page itself when nothing is cached", () => {
    expect(mergeCursorPage(undefined, page(["c"], false), "b")).toEqual(
      page(["c"], false),
    );
  });
});
