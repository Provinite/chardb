import { describe, it, expect } from "vitest";
import { drillQuery, parseSpotlightQuery } from "../spotlightQuery";

describe("parseSpotlightQuery", () => {
  it("reads a bare query as page navigation", () => {
    expect(parseSpotlightQuery("Item Ledger")).toEqual({
      mode: "pages",
      term: "item ledger",
    });
  });

  it("reads @ as asking who is here", () => {
    expect(parseSpotlightQuery("@")).toEqual({ mode: "people", term: "" });
  });

  it("reads @name as searching for a person", () => {
    expect(parseSpotlightQuery("@neo")).toEqual({
      mode: "people",
      term: "neo",
    });
  });

  it("keeps the person's name as typed", () => {
    // It goes into a URL and into an exact-match search, neither of which
    // wants it lowercased -- unlike every term, which is matched case-blind.
    expect(parseSpotlightQuery("@NeoTheBaka/INV")).toEqual({
      mode: "person",
      username: "NeoTheBaka",
      term: "inv",
    });
  });

  it("reads a trailing slash as asking which of their pages", () => {
    expect(parseSpotlightQuery("@neo/")).toEqual({
      mode: "person",
      username: "neo",
      term: "",
    });
  });

  it("reads @/ as nobody, not as a person with no name", () => {
    expect(parseSpotlightQuery("@/")).toEqual({ mode: "people", term: "" });
  });

  it("round-trips the query that drills into someone", () => {
    expect(parseSpotlightQuery(drillQuery("neo"))).toEqual({
      mode: "person",
      username: "neo",
      term: "",
    });
  });
});
