import { describe, expect, it } from "vitest";
import { track } from "./track";

describe("track", () => {
  it("shares the remaining width without a content minimum", () => {
    expect(track.fr(2)).toBe("minmax(0, 2fr)");
  });

  it("shares the remaining width above a minimum", () => {
    expect(track.fr(1, "var(--size-column-md)")).toBe(
      "minmax(var(--size-column-md), 1fr)",
    );
  });

  it("is a fixed width", () => {
    expect(track.fixed("var(--size-column-sm)")).toBe("var(--size-column-sm)");
  });

  it("is as wide as its content", () => {
    expect(track.content).toBe("max-content");
  });
});
